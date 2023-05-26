/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldNumber,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiTextArea,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import type { ChangeEvent } from 'react';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import type { Cancelable } from 'lodash';
import { debounce } from 'lodash';
import type { EqlOptionsSelected, FieldsEqlOptions } from '@kbn/timelines-plugin/common';

import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { Conversation } from '@kbn/elastic-assistant';
import { HttpSetup } from '@kbn/core-http-browser';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { YOU_ARE_A_HELPFUL_EXPERT_ASSISTANT } from '../content/prompts/system/translations';
import * as i18n from './translations';
import { ConnectorSelector } from '../connectorland/connector_selector';

export interface SettingsPopoverProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  conversation: Conversation;
  http: HttpSetup;
  isDisabled?: boolean;
  optionsData?: {
    models: EuiComboBoxOptionOption[];
    prompt: string;
    temperature: number;
  };
  optionsSelected?: EqlOptionsSelected;
  onOptionsChange?: (field: FieldsEqlOptions, newValue: string | undefined) => void;
}

type SizeVoidFunc = (newSize: string) => void;

const singleSelection = { asPlainText: true };

const defaultOptionsData: SettingsPopoverProps['optionsData'] = {
  models: [{ label: 'text-davinci-003' }, { label: 'gpt-3.5-turbo' }, { label: 'gpt-4' }],
  prompt: YOU_ARE_A_HELPFUL_EXPERT_ASSISTANT,
  temperature: 0.2,
};

export const SettingsPopover: React.FC<SettingsPopoverProps> = React.memo(
  ({
    actionTypeRegistry,
    conversation,
    http,
    isDisabled = false,
    optionsData = defaultOptionsData,
    optionsSelected,
    onOptionsChange,
  }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    // So we can hide the settings popover when the connector modal is displayed
    const popoverPanelRef = useRef<HTMLElement | null>(null);
    const [localSize, setLocalSize] = useState(optionsSelected?.size ?? 0.2);
    const debounceSize = useRef<Cancelable & SizeVoidFunc>();

    const provider = useMemo(() => {
      return conversation.apiConfig?.provider;
    }, [conversation.apiConfig]);

    const closeSettingsHandler = useCallback(() => {
      setIsSettingsOpen(false);
    }, []);

    const handleEventCategoryField = useCallback(
      (opt: EuiComboBoxOptionOption[]) => {
        if (onOptionsChange) {
          if (opt.length > 0) {
            onOptionsChange('eventCategoryField', opt[0].label);
          } else {
            onOptionsChange('eventCategoryField', undefined);
          }
        }
      },
      [onOptionsChange]
    );
    const handleTimestampField = useCallback(
      (opt: ChangeEvent<HTMLTextAreaElement>) => {
        if (onOptionsChange) {
          if (opt.target.value.length > 0) {
            onOptionsChange('timestampField', opt.target.value);
          } else {
            onOptionsChange('timestampField', undefined);
          }
        }
      },
      [onOptionsChange]
    );
    const handleTempChange = useCallback(
      (evt) => {
        if (onOptionsChange) {
          setLocalSize(evt?.target?.value);
          if (debounceSize.current?.cancel) {
            debounceSize.current?.cancel();
          }
          debounceSize.current = debounce((newSize) => onOptionsChange('size', newSize), 800);
          debounceSize.current(evt?.target?.value);
        }
      },
      [onOptionsChange]
    );

    // Hide settings panel when modal is visible (to keep visual clutter minimal)
    const onConnectorModalVisibilityChange = useCallback((isVisible: boolean) => {
      if (popoverPanelRef.current) {
        popoverPanelRef.current.style.visibility = isVisible ? 'hidden' : 'visible';
      }
    }, []);

    return (
      <EuiPopover
        button={
          <EuiToolTip position="right" content={i18n.SETTINGS_TITLE}>
            <EuiButtonIcon
              disabled={isDisabled}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              iconType="controlsVertical"
              aria-label={i18n.SETTINGS_TITLE}
              data-test-subj="assistant-settings-button"
            />
          </EuiToolTip>
        }
        isOpen={isSettingsOpen}
        closePopover={closeSettingsHandler}
        anchorPosition="rightCenter"
        ownFocus={false}
        panelRef={(el) => (popoverPanelRef.current = el)}
      >
        <EuiPopoverTitle>{i18n.SETTINGS_TITLE}</EuiPopoverTitle>
        <div style={{ width: '300px' }}>
          <EuiFormRow
            data-test-subj="model-field"
            label={i18n.SETTINGS_CONNECTOR_TITLE}
            helpText={
              <EuiLink
                href={`${http.basePath.get()}/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`}
                target="_blank"
                external
              >
                <FormattedMessage
                  id="xpack.elasticAssistant.assistant.settings.connectorHelpTextTitle"
                  defaultMessage="Kibana Connector to make requests with"
                />
              </EuiLink>
            }
          >
            <ConnectorSelector
              actionTypeRegistry={actionTypeRegistry}
              conversation={conversation}
              http={http}
              onConnectorModalVisibilityChange={onConnectorModalVisibilityChange}
            />
          </EuiFormRow>

          {provider === OpenAiProviderType.OpenAi && (
            <>
              <EuiFormRow
                data-test-subj="model-field"
                label={i18n.SETTINGS_MODEL_TITLE}
                helpText={i18n.SETTINGS_MODEL_HELP_TEXT_TITLE}
              >
                <EuiComboBox
                  options={optionsData?.models}
                  selectedOptions={[optionsData?.models[0]]}
                  singleSelection={singleSelection}
                  onChange={handleEventCategoryField}
                />
              </EuiFormRow>

              <EuiFormRow
                data-test-subj="temperature-field"
                label={i18n.SETTINGS_TEMPERATURE_TITLE}
                helpText={i18n.SETTINGS_TEMPERATURE_HELP_TEXT}
              >
                <EuiFieldNumber
                  value={localSize}
                  onChange={handleTempChange}
                  min={0}
                  max={2}
                  step={0.1}
                />
              </EuiFormRow>
            </>
          )}

          <EuiFormRow
            data-test-subj="prompt-field"
            label={i18n.SETTINGS_PROMPT_TITLE}
            helpText={i18n.SETTINGS_PROMPT_HELP_TEXT_TITLE}
          >
            <EuiTextArea
              autoFocus
              aria-label={i18n.SETTINGS_PROMPT_TITLE}
              value={optionsData?.prompt}
              onChange={handleTimestampField}
            />
          </EuiFormRow>
        </div>
      </EuiPopover>
    );
  }
);
SettingsPopover.displayName = 'SettingPopover';
