/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFieldText,
  EuiFormRow,
  EuiIcon,
  EuiInMemoryTable,
  EuiPanel,
  EuiPopover,
  EuiSearchBarProps,
  EuiSpacer,
  EuiTableSelectionType,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState } from 'react';
import { KnowledgeBaseEntryResponse } from '@kbn/elastic-assistant-common';
import { AlertsSettingsManagement } from '../../alerts/settings/alerts_settings_management';
import { useKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_knowledge_base_entries';
import { useDeleteKnowledgeBase } from '../../assistant/api/knowledge_base/use_delete_knowledge_base';
import { useKnowledgeBaseStatus } from '../../assistant/api/knowledge_base/use_knowledge_base_status';
import { useSetupKnowledgeBase } from '../../assistant/api/knowledge_base/use_setup_knowledge_base';
import { KnowledgeBaseConfig } from '../../assistant/types';
import { useAssistantContext } from '../../assistant_context';
import { ESQL_RESOURCE } from '../const';
import { KnowledgeBaseSwitch } from '../knowledgeBaseSwitch';
import * as i18n from '../translations';
import { useKnowledgeBaseResultStatus } from '../use_knowledge_base_result_status';
import { useKnowledgeBaseTable } from './use_knowledge_base_table';

interface Props {
  knowledgeBase: KnowledgeBaseConfig;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
}

export const KnowledgeBaseSettingsManagement: React.FC<Props> = React.memo(
  ({ knowledgeBase, setUpdatedKnowledgeBaseSettings }) => {
    const { euiTheme } = useEuiTheme();
    const {
      assistantFeatures: { assistantKnowledgeBaseByDefault: enableKnowledgeBaseByDefault },
      http,
    } = useAssistantContext();
    const {
      data: kbStatus,
      isLoading,
      isFetching,
    } = useKnowledgeBaseStatus({ http, resource: ESQL_RESOURCE });
    const { mutate: setupKB, isLoading: isSettingUpKB } = useSetupKnowledgeBase({ http });
    const { mutate: deleteKB, isLoading: isDeletingUpKB } = useDeleteKnowledgeBase({ http });
    const { data: entries, isLoading: isLoadingKBEntries } = useKnowledgeBaseEntries({ http });
    const { getColumns } = useKnowledgeBaseTable();
    const columns = getColumns({
      onEntryNameClicked: (id: string) => {
        console.log('Entry name clicked', id);
      },
      onSpaceNameClicked: (namespace: string) => {
        console.log('Space name clicked', namespace);
      },
    });

    const {
      isElserEnabled,
      isKnowledgeBaseEnabled,
      isESQLEnabled,
      isLoadingKb,
      isKnowledgeBaseAvailable,
      isESQLAvailable,
      isSwitchDisabled,
    } = useKnowledgeBaseResultStatus({
      enableKnowledgeBaseByDefault,
      kbStatus,
      knowledgeBase,
      isLoading,
      isFetching,
      isSettingUpKB,
      isDeletingUpKB,
    });
    const [selection, setSelection] = useState<KnowledgeBaseEntryResponse[]>([]);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const closePopover = () => setIsPopoverOpen(false);

    const selectionValue: EuiTableSelectionType<KnowledgeBaseEntryResponse> = {
      // onSelectionChange: (item: KnowledgeBaseEntryResponse) => {
      //   if (!item) {
      //     return;
      //   }
      //   setSelection((prev) => {
      //     const newSelection: Set<KnowledgeBaseEntryResponse> = prev ? new Set(prev) : new Set();
      //     if (newSelection.has(item)) {
      //       newSelection.delete(item);
      //     } else {
      //       newSelection.add(item);
      //     }
      //     return newSelection;
      //   });
      // },
      onSelectionChange: (item) => setSelection(item),
    };
    const button = (
      <EuiButton iconType="arrowDown" iconSide="right" fill>
        <EuiIcon type="plusInCircle" />
        {'Entry'}
      </EuiButton>
    );
    const renderToolsRight = () => {
      return (
        <EuiPopover
          initialFocus="#name"
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
        >
          <EuiFormRow label="Enter name" id="name">
            <EuiFieldText compressed name="input" />
          </EuiFormRow>
        </EuiPopover>
      );
    };

    const search: EuiSearchBarProps = {
      toolsRight: renderToolsRight(),
      box: {
        incremental: true,
      },
      filters: [
        {
          type: 'field_value_selection',
          field: 'namespace',
          name: 'Spaces',
          multiSelect: false,
          options: entries.data.map(({ namespace }) => ({
            value: namespace,
          })),
        },
      ],
    };

    return (
      <>
        <EuiPanel hasShadow={false} hasBorder paddingSize="l">
          <KnowledgeBaseSwitch
            compressed={false}
            enableKnowledgeBaseByDefault={enableKnowledgeBaseByDefault}
            isEnabledKnowledgeBase={knowledgeBase.isEnabledKnowledgeBase}
            isLoadingKb={isLoadingKb}
            isSwitchDisabled={isSwitchDisabled}
            kbStatusElserExists={kbStatus?.elser_exists ?? false}
            knowledgeBase={knowledgeBase}
            setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
            setupKB={setupKB}
            showLabel={true}
          />
          <EuiSpacer size="m" />
          <EuiText size={'m'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
          <EuiSpacer size="l" />
          <EuiInMemoryTable
            columns={columns}
            items={entries.data ?? []}
            selection={selectionValue}
            search={search}
          />
        </EuiPanel>
        <EuiSpacer size="m" />
        <AlertsSettingsManagement
          knowledgeBase={knowledgeBase}
          setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
        />
      </>
    );
  }
);

KnowledgeBaseSettingsManagement.displayName = 'KnowledgeBaseSettingsManagement';
