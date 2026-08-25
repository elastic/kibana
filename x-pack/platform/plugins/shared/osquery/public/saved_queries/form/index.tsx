/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  IntervalField,
  QueryIdField,
  QueryDescriptionField,
  VersionField,
  ResultsTypeField,
  TimeoutField,
} from '../../form';
import { PlatformCheckBoxGroupField } from '../../packs/queries/platform_checkbox_group_field';
import { ALL_OSQUERY_VERSIONS_OPTIONS } from '../../packs/queries/constants';
import { ECSMappingEditorField } from '../../packs/queries/lazy_ecs_mapping_editor_field';
import { PlaygroundFlyout } from './playground_flyout';
import { CodeEditorField } from './code_editor_field';
import { overflowCss } from '../../packs/utils';

interface SavedQueryFormProps {
  viewMode?: boolean;
  hasPlayground?: boolean;
  isValid?: boolean;
  idSet?: Set<string>;
}

const SavedQueryFormComponent: React.FC<SavedQueryFormProps> = ({
  viewMode,
  hasPlayground,
  isValid,
  idSet,
}) => {
  const [playgroundVisible, setPlaygroundVisible] = useState(false);

  const euiFieldProps = useMemo(
    () => ({
      isDisabled: !!viewMode,
    }),
    [viewMode]
  );

  const handleHidePlayground = useCallback(() => setPlaygroundVisible(false), []);

  const handleTogglePlayground = useCallback(
    () => setPlaygroundVisible((prevValue) => !prevValue),
    []
  );

  const intervalEuiFieldProps = useMemo(
    () => ({
      append: 's',
      ...euiFieldProps,
    }),
    [euiFieldProps]
  );

  const versionEuiFieldProps = useMemo(
    () => ({
      noSuggestions: false,
      singleSelection: { asPlainText: true },
      placeholder: i18n.translate('xpack.osquery.pack.queriesTable.osqueryVersionAllLabel', {
        defaultMessage: 'ALL',
      }),
      options: ALL_OSQUERY_VERSIONS_OPTIONS,
      onCreateOption: undefined,
      ...euiFieldProps,
    }),
    [euiFieldProps]
  );

  return (
    <>
      <QueryIdField idSet={idSet} euiFieldProps={euiFieldProps} />
      <EuiSpacer />
      <QueryDescriptionField euiFieldProps={euiFieldProps} />
      <EuiSpacer />
      <CodeEditorField euiFieldProps={euiFieldProps} />
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent={'spaceBetween'}>
        <EuiFlexItem>
          <TimeoutField euiFieldProps={euiFieldProps} />
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
      <EuiFlexGroup>
        <EuiFlexItem css={overflowCss}>
          <ECSMappingEditorField euiFieldProps={euiFieldProps} />
        </EuiFlexItem>
      </EuiFlexGroup>

      {!viewMode && hasPlayground && (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="play" onClick={handleTogglePlayground}>
              <FormattedMessage
                id="xpack.osquery.savedQueries.form.packConfigSection.testConfigButtonLabel"
                defaultMessage="Test configuration"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiSpacer size="xl" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.osquery.savedQueries.form.packConfigSection.title"
                defaultMessage="Pack configuration"
              />
            </h5>
          </EuiTitle>
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.osquery.savedQueries.form.packConfigSection.description"
              defaultMessage="The options listed below are optional and are only applied when the query is assigned to a pack."
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem>
          <IntervalField euiFieldProps={intervalEuiFieldProps} />
          <EuiSpacer size="m" />
          <VersionField euiFieldProps={versionEuiFieldProps} />
          <EuiSpacer size="m" />
          <ResultsTypeField euiFieldProps={euiFieldProps} />
        </EuiFlexItem>
        <EuiFlexItem>
          <PlatformCheckBoxGroupField euiFieldProps={euiFieldProps} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {playgroundVisible && (
        <PlaygroundFlyout
          enabled={isValid !== undefined ? isValid : true}
          onClose={handleHidePlayground}
        />
      )}
    </>
  );
};

SavedQueryFormComponent.displayName = 'SavedQueryForm';

export const SavedQueryForm = React.memo(SavedQueryFormComponent);
