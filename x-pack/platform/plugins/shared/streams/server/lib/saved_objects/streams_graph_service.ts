/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type { StreamsGraph } from '@kbn/streams-schema';
import {
  STREAMS_CONFIGURATION_SAVED_OBJECT_ID,
  STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
  STREAMS_UI_METADATA_SAVED_OBJECT_ID,
  STREAMS_UI_METADATA_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import type {
  StreamsConfigurationSavedObjectAttributes,
  StreamsUiMetadataSavedObjectAttributes,
} from './streams_configuration';

const STREAMS_METADATA_REFERENCE_NAME = 'streamsMetadata';

const emptyGraph: StreamsGraph.Configuration = {
  sources: [],
  pipeline_definitions: [],
  pipelines: [],
  routing_nodes: [],
  destinations: [],
};

const isNotFoundError = (error: unknown): boolean => {
  return (
    (error as { output?: { statusCode?: number } })?.output?.statusCode === 404 ||
    (error as { statusCode?: number })?.statusCode === 404
  );
};

const getGraphNodeNames = (graph: StreamsGraph.Configuration): Set<string> => {
  return new Set(
    [...graph.sources, ...graph.pipelines, ...graph.routing_nodes, ...graph.destinations].flatMap(
      ({ name }) => (typeof name === 'string' ? [name] : [])
    )
  );
};

const pruneStaleNodeMetadata = (
  metadata: StreamsGraph.UiMetadata,
  graph: StreamsGraph.Configuration
): StreamsGraph.UiMetadata => {
  const nodes = metadata.nodes;

  if (!nodes || typeof nodes !== 'object' || Array.isArray(nodes)) {
    return metadata;
  }

  const nodeNames = getGraphNodeNames(graph);
  const prunedNodes = Object.fromEntries(
    Object.entries(nodes).filter(([nodeName]) => nodeNames.has(nodeName))
  ) as StreamsGraph.Node;

  return {
    ...metadata,
    nodes: prunedNodes,
  };
};

export class StreamsGraphService {
  private readonly soClient: SavedObjectsClientContract;
  private readonly logger: Logger;
  // TODO: Once available this will publish through to WarpStream
  private readonly publishGraph: (graph: StreamsGraph.Configuration) => Promise<void>;

  constructor({
    soClient,
    logger,
    publishGraph = async () => {},
  }: {
    soClient: SavedObjectsClientContract;
    logger: Logger;
    publishGraph?: (graph: StreamsGraph.Configuration) => Promise<void>;
  }) {
    this.soClient = soClient;
    this.logger = logger;
    this.publishGraph = publishGraph;
  }

  async getGraph(): Promise<StreamsGraph.GetResponse> {
    const [configuration, uiMetadata] = await Promise.all([
      this.getConfigurationSavedObject(),
      this.getUiMetadataSavedObject(),
    ]);

    return {
      graph: configuration?.attributes ?? emptyGraph,
      ui_metadata: uiMetadata?.attributes.metadata ?? {},
    };
  }

  async upsertGraph({ graph, ui_metadata: uiMetadata }: StreamsGraph.UpsertRequest): Promise<void> {
    const existingConfiguration = await this.getConfigurationSavedObject();

    await this.writeConfiguration(graph);

    try {
      await this.publishGraph(graph);
    } catch (error) {
      this.logger.error(`Failed to publish Streams graph configuration: ${error}`);
      await this.rollbackConfiguration(existingConfiguration);
      throw error;
    }

    await this.writeUiMetadata(pruneStaleNodeMetadata(uiMetadata, graph));
  }

  private async getConfigurationSavedObject(): Promise<
    SavedObject<StreamsConfigurationSavedObjectAttributes> | undefined
  > {
    try {
      return await this.soClient.get<StreamsConfigurationSavedObjectAttributes>(
        STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
        STREAMS_CONFIGURATION_SAVED_OBJECT_ID
      );
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async getUiMetadataSavedObject(): Promise<
    SavedObject<StreamsUiMetadataSavedObjectAttributes> | undefined
  > {
    try {
      return await this.soClient.get<StreamsUiMetadataSavedObjectAttributes>(
        STREAMS_UI_METADATA_SAVED_OBJECT_TYPE,
        STREAMS_UI_METADATA_SAVED_OBJECT_ID
      );
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async writeConfiguration(graph: StreamsGraph.Configuration): Promise<void> {
    await this.soClient.create(STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE, graph, {
      id: STREAMS_CONFIGURATION_SAVED_OBJECT_ID,
      overwrite: true,
      references: [
        {
          name: STREAMS_METADATA_REFERENCE_NAME,
          type: STREAMS_UI_METADATA_SAVED_OBJECT_TYPE,
          id: STREAMS_UI_METADATA_SAVED_OBJECT_ID,
        },
      ],
    });
  }

  private async writeUiMetadata(metadata: StreamsGraph.UiMetadata): Promise<void> {
    await this.soClient.create(
      STREAMS_UI_METADATA_SAVED_OBJECT_TYPE,
      { metadata },
      {
        id: STREAMS_UI_METADATA_SAVED_OBJECT_ID,
        overwrite: true,
      }
    );
  }

  private async rollbackConfiguration(
    previousConfiguration: SavedObject<StreamsConfigurationSavedObjectAttributes> | undefined
  ): Promise<void> {
    if (!previousConfiguration) {
      await this.soClient.delete(
        STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
        STREAMS_CONFIGURATION_SAVED_OBJECT_ID
      );
      return;
    }

    await this.soClient.create(
      STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
      previousConfiguration.attributes,
      {
        id: STREAMS_CONFIGURATION_SAVED_OBJECT_ID,
        overwrite: true,
        references: previousConfiguration.references,
      }
    );
  }
}
