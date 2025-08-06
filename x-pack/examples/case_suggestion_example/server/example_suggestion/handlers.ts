/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { TimeRange } from '@kbn/es-query';
import { SuggestionResponse, AttachmentType } from '@kbn/cases-plugin/common';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import { CaseAttachmentWithoutOwner } from '@kbn/cases-plugin/common';
import type { SyntheticsMonitorSuggestion } from '../../common/types';

export const getExampleByServiceName = async ({
  /* Example of passing dependencies to the handler
   * Not in use as data fetching is mocked */
  dependencies,
  params,
}: {
  dependencies: {
    savedObjectsClient: SavedObjectsClientContract;
    share: SharePluginStart;
  };
  params: {
    timeRange: TimeRange;
    serviceName: string;
  };
}): Promise<SuggestionResponse<SyntheticsMonitorSuggestion>> => {
  const mockResult = {
    saved_objects: [
      {
        attributes: {
          name: 'Example Monitor',
          id: 'example-monitor-id',
        },
      },
      {
        attributes: {
          name: 'Another Monitor',
          id: 'another-monitor-id',
        },
      },
    ],
  };

  /* Fetch any data you need to back the suggestion from Elasticsearch, saved objects, or other sources
   * Mocked here */
  const result = await new Promise<{
    saved_objects: Array<{ attributes: { name: string; id: string } }>;
  }>((resolve) => resolve(mockResult));

  /* Generate the data for the suggestion response. You can include one or more suggestion items as part of the response.
   * Here we are including one suggestion item per monitor we've found, all as part of the same suggestion response.
   * However, you can also limit the amount of suggestion items you return as you see fit, and in many case may only
   * want to return one */
  const data = result.saved_objects.map((obj) => {
    const attachment: CaseAttachmentWithoutOwner = {
      type: AttachmentType.persistableState,
      persistableStateAttachmentTypeId: '.page',
      persistableStateAttachmentState: {
        type: 'synthetics_monitor',
        url: {
          pathAndQuery: `/app/synthetics/monitors/${obj.attributes.id}`,
          label: obj.attributes.name,
          actionLabel: i18n.translate(
            'xpack.synthetics.cases.addToCaseModal.goToMonitorActionLabel',
            {
              defaultMessage: 'Go to Monitor',
            }
          ),
          iconType: 'uptimeApp',
        },
      },
    };
    return {
      // a plaintext description of why the individual suggestion is relevant
      description: `Monitor "${obj.attributes.name}" is down 5 times between ${params.timeRange.from} and ${params.timeRange.to}`,
      payload: obj.attributes,
      attachment,
    };
  });

  return {
    suggestions: [
      {
        id: 'example',
        // a plaintext summary of the entire payload, which may include multiple individual suggestion items
        description: `Found ${data.length} synthetics monitors for service "${params.serviceName}" in the last ${params.timeRange.from} to ${params.timeRange.to}`,
        data,
      },
    ],
  };
};
