/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import { isDraftStream } from '@kbn/streams-schema';
import { DATA_SOURCES_I18N } from './translations';
import {
  createDefaultCustomSamplesDataSource,
  defaultKqlSamplesDataSource,
} from '../state_management/stream_enrichment_state_machine/utils';
import {
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from '../state_management/stream_enrichment_state_machine';

export const AddDataSourcesContextMenu = () => {
  const { addDataSource } = useStreamEnrichmentEvents();
  const definition = useStreamEnrichmentSelector((state) => state.context.definition);
  const streamName = definition.stream.name;

  const isDraft = isDraftStream(definition.stream);

  const [isOpen, { toggle: toggleMenu, off: closeMenu }] = useBoolean();

  const menuItems = useMemo(() => {
    const items = [];

    if (!isDraft) {
      items.push({
        name: DATA_SOURCES_I18N.contextMenu.addKqlDataSource,
        icon: 'magnify',
        'data-test-subj': 'streamsAppProcessingAddKqlDataSource',
        onClick: () => {
          addDataSource(defaultKqlSamplesDataSource);
          closeMenu();
        },
      });
    }

    items.push({
      name: DATA_SOURCES_I18N.contextMenu.addCustomSamples,
      icon: 'text',
      'data-test-subj': 'streamsAppProcessingAddCustomDataSource',
      onClick: () => {
        addDataSource(createDefaultCustomSamplesDataSource(streamName));
        closeMenu();
      },
    });

    return items;
  }, [isDraft, addDataSource, closeMenu, streamName]);

  return (
    <EuiPopover
      data-test-subj="streamsAppProcessingAddDataSourcesContextMenu"
      id="data-sources-menu"
      button={
        <EuiButton size="s" iconType="chevronSingleDown" iconSide="right" onClick={toggleMenu}>
          {DATA_SOURCES_I18N.contextMenu.addDataSource}
        </EuiButton>
      }
      isOpen={isOpen}
      closePopover={closeMenu}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu
        initialPanelId="data-source-options"
        panels={[
          {
            id: 'data-source-options',
            items: menuItems,
          },
        ]}
      />
    </EuiPopover>
  );
};
