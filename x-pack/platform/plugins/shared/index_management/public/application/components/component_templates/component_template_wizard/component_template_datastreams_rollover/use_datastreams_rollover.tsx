/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { useComponentTemplatesContext } from '../../component_templates_context';
import { MappingsDatastreamRolloverModal } from './mappings_datastreams_rollover_modal';

export const test = {};

export function useDatastreamsRollover() {
  const { api, startServices } = useComponentTemplatesContext();

  const showDatastreamRolloverModal = useCallback(
    async (componentTemplateName: string) => {
      const { data: dataStreamResponse } = await api.getComponentTemplateDatastreams(
        componentTemplateName
      );
      const dataStreams = dataStreamResponse?.data_streams ?? [];

      const dataStreamsToRollover: string[] = [];
      for (const dataStream of dataStreams) {
        try {
          const { error: applyMappingError } = await api.postDataStreamMappingsFromTemplate(
            dataStream
          );
          if (applyMappingError) {
            throw applyMappingError;
          }
        } catch (err) {
          dataStreamsToRollover.push(dataStream);
        }
      }

      if (dataStreamsToRollover.length) {
        const { overlays, ...mountServices } = startServices;
        const ref = overlays.openModal(
          toMountPoint(
            <MappingsDatastreamRolloverModal
              componentTemplatename={componentTemplateName}
              dataStreams={dataStreamsToRollover}
              api={api}
              onClose={() => {
                ref.close();
              }}
            />,
            mountServices
          )
        );

        await ref.onClose;
      }
    },
    [api, startServices]
  );

  return {
    showDatastreamRolloverModal,
  };
}
