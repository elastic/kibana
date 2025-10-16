/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsUpdateOptions,
  SavedObjectsDeleteOptions,
  SavedObject,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
  Logger,
} from '@kbn/core/server';
import type { IntegrationAttributes, DataStreamAttributes } from './schemas/types';
import { AUTOMATIC_IMPORT_DATA_STREAM_SAVED_OBJECT_TYPE, AUTOMATIC_IMPORT_INTEGRATION_SAVED_OBJECT_TYPE } from './constants';


interface SavedObjectServiceOptions {
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export class AutomaticImportSavedObjectService {
  private savedObjectsClient: SavedObjectsClientContract;
  private logger: Logger;

  constructor({ savedObjectsClient, logger }: SavedObjectServiceOptions) {
    this.savedObjectsClient = savedObjectsClient;
    this.logger = logger;
  }

  /**
   * Integration Operations
   */

  /**
  * Create or update an integration
  * @param data - The integration data
  * @param options - The options for the update
  * @returns The saved object
  */
  async upsertIntegration(data: IntegrationAttributes, options?: SavedObjectsUpdateOptions<IntegrationAttributes>) {
    try {
      this.logger.debug(`Creating/Updating integration: ${data.integration_id}`);

      const { integration_id, data_stream_count = 0, status, metadata } = data;
      const integrationsData: IntegrationAttributes = {
        integration_id,
        data_stream_count,
        status,
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...metadata,
        },
      };
      // NEED TO CHECK THIS
      return await this.savedObjectsClient.update<IntegrationAttributes>(
        AUTOMATIC_IMPORT_INTEGRATION_SAVED_OBJECT_TYPE,
        integration_id,
        integrationsData,
        {
          upsert: integrationsData,
          ...options,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to create/update integration: ${error}`);
      throw error;
    }
  }

  /**
   * Get an integration by ID
   * @param integrationId - The ID of the integration
   * @returns The integration
   */
  async getIntegration(integrationId: string): Promise<SavedObject<IntegrationAttributes>> {
    try {
      this.logger.debug(`Getting integration: ${integrationId}`);
      return await this.savedObjectsClient.get<IntegrationAttributes>(
        AUTOMATIC_IMPORT_INTEGRATION_SAVED_OBJECT_TYPE,
        integrationId
      );
    } catch (error) {
      this.logger.error(`Failed to get integration ${integrationId}: ${error}`);
      throw error;
    }
  }

  /**
   * @returns All integrations
   */
  async getAllIntegrations(): Promise<SavedObjectsFindResponse<IntegrationAttributes>> {
    try {
      this.logger.debug('Getting all integrations');
      return await this.savedObjectsClient.find<IntegrationAttributes>({
        type: AUTOMATIC_IMPORT_INTEGRATION_SAVED_OBJECT_TYPE,
      });
    }
    catch (error) {
      this.logger.error(`Failed to get all integrations: ${error}`);
      throw error;
    }
  }

  /**
   * Delete an integration by ID
   * @param integrationId - The ID of the integration
   * @param options - The options for the delete
   * @returns The deleted integration
   */
  async deleteIntegration(integrationId: string, options?: SavedObjectsDeleteOptions): Promise<{}> {
    try {
      this.logger.debug(`Deleting integration with id:${integrationId}`)
      return await this.savedObjectsClient.delete(AUTOMATIC_IMPORT_INTEGRATION_SAVED_OBJECT_TYPE, integrationId, options)
    } catch (error) {
      this.logger.error(`Failed to delete integration ${integrationId}: ${error}`);
      throw error;
    }
  }


  /**
   * Data Stream Operations
   */
  async upsertDataStream(
    data: DataStreamAttributes,
    options?: SavedObjectsUpdateOptions<DataStreamAttributes>
  ): Promise<SavedObjectsUpdateResponse<DataStreamAttributes>> {
    try {
      this.logger.debug(`Creating data stream: ${data.data_stream_id}`);

      const { integration_id, data_stream_id, job_info, metadata, result } = data;

      // A Data Stream must always be associated with an Integration
      const integrationTarget = await this.getIntegration(integration_id);
      if (!integrationTarget) {
        throw new Error(`Integration ${integration_id} not found`);
      }

      // should we check for name here or later on when we have more complex workflows?
      const dataStreamData: DataStreamAttributes = {
        integration_id,
        data_stream_id,
        job_info,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        result: result || {},
      };

      return await this.savedObjectsClient.update<DataStreamAttributes>(
        AUTOMATIC_IMPORT_DATA_STREAM_SAVED_OBJECT_TYPE,
        data.data_stream_id,
        dataStreamData,
        {
          upsert: dataStreamData,
          ...options,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to create data stream: ${error}`);
      throw error;
    }
  }

  /**
   * Get a data stream by ID
   * @param dataStreamId - The ID of the data stream
   * @returns The data stream
   */
  async getDataStream(dataStreamId: string): Promise<SavedObject<DataStreamAttributes>> {
    try {
      this.logger.debug(`Getting data stream: ${dataStreamId}`);
      return await this.savedObjectsClient.get<DataStreamAttributes>(
        AUTOMATIC_IMPORT_DATA_STREAM_SAVED_OBJECT_TYPE,
        dataStreamId
      );
    } catch (error) {
      this.logger.error(`Failed to get data stream ${dataStreamId}: ${error}`);
      throw error;
    }
  }

  /**
   * Get all data streams
   * @returns All data streams
   */
  async getAllDataStreams(): Promise<SavedObjectsFindResponse<DataStreamAttributes>> {
    try {
      this.logger.debug('Getting all data streams');
      return await this.savedObjectsClient.find<DataStreamAttributes>({
        type: AUTOMATIC_IMPORT_DATA_STREAM_SAVED_OBJECT_TYPE,
      });
    }
    catch (error) {
      this.logger.error(`Failed to get all data streams: ${error}`);
      throw error;
    }
  }

  /**
   * Find all data streams by integration ID
   * @param integrationId - The ID of the integration
   * @returns All data streams for the integration
   */
  async findAllDataStreamsByIntegrationId(integrationId: string): Promise<SavedObjectsFindResponse<DataStreamAttributes>> {
    try {
      this.logger.debug(`Finding all data streams for integration: ${integrationId}`);

      return await this.savedObjectsClient.find<DataStreamAttributes>({
        type: AUTOMATIC_IMPORT_DATA_STREAM_SAVED_OBJECT_TYPE,
        filter: `${AUTOMATIC_IMPORT_DATA_STREAM_SAVED_OBJECT_TYPE}.attributes.integration_id: "${integrationId}"`,
      });
    } catch (error) {
      this.logger.error(`Failed to find all data streams for integration ${integrationId}: ${error}`);
      throw error;
    }
  }

  /**
   * Delete a data stream by ID
   * @param dataStreamId - The ID of the data stream
   * @param options - The options for the delete
   * @returns The deleted data stream
   */
  async deleteDataStream(dataStreamId: string, options?: SavedObjectsDeleteOptions): Promise<{}> {
    try {
      this.logger.debug(`Deleting data stream with id:${dataStreamId}`);
      return await this.savedObjectsClient.delete(AUTOMATIC_IMPORT_DATA_STREAM_SAVED_OBJECT_TYPE, dataStreamId, options);
    } catch (error) {
      this.logger.error(`Failed to delete data stream ${dataStreamId}: ${error}`);
      throw error;
    }
  }
}

