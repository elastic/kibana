/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { EuiAccordionProps, UseEuiTheme } from '@elastic/eui';
import { EuiCodeBlock, EuiFormRow, EuiAccordion, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { QUERY_TIMEOUT } from '../../../common/constants';
import { TimeoutField } from '../../form/timeout_field';
import type { LiveQueryFormFields } from '.';
import { OsqueryEditor } from '../../editor';
import { useKibana } from '../../common/lib/kibana';
import { ECSMappingEditorField } from '../../packs/queries/lazy_ecs_mapping_editor_field';
import type { SavedQueriesDropdownProps } from '../../saved_queries/saved_queries_dropdown';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';

const euiCodeBlockCss = {
  minHeight: '100px',
};

const euiAccordionCss = ({ euiTheme }: UseEuiTheme) => ({
  '.euiAccordion__button': {
    color: euiTheme.colors.primary,
  },
  '.euiAccordion__childWrapper': {
    WebkitTransition: 'none',
  },
});

export interface LiveQueryQueryFieldProps {
  handleSubmitForm?: () => void;
  disabled?: boolean;
}

const LiveQueryQueryFieldComponent: React.FC<LiveQueryQueryFieldProps> = ({
  disabled,
  handleSubmitForm,
}) => {
  const { formState, watch, resetField } = useFormContext<LiveQueryFormFields>();
  const [advancedContentState, setAdvancedContentState] = useState<EuiAccordionProps['forceState']>(
    () => (isEmpty(formState.defaultValues?.ecs_mapping) ? 'closed' : 'open')
  );
  const permissions = useKibana().services.application.capabilities.osquery;
  const [queryType] = watch(['queryType']);
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name: 'query',
    rules: {
      required: {
        message: i18n.translate('xpack.osquery.pack.queryFlyoutForm.emptyQueryError', {
          defaultMessage: 'Query is a required field',
        }),
        value: queryType !== 'pack',
      },
    },
    defaultValue: '',
  });

  const handleSavedQueryChange: SavedQueriesDropdownProps['onChange'] = useCallback(
    (savedQuery) => {
      if (savedQuery) {
        resetField('query', { defaultValue: savedQuery.query });
        resetField('savedQueryId', { defaultValue: savedQuery.savedQueryId });
        resetField('ecs_mapping', { defaultValue: savedQuery.ecs_mapping ?? {} });
        resetField('timeout', { defaultValue: savedQuery.timeout ?? QUERY_TIMEOUT.DEFAULT });

        if (!isEmpty(savedQuery.ecs_mapping)) {
          setAdvancedContentState('open');
        }
      } else {
        resetField('savedQueryId');
      }
    },
    [resetField]
  );

  const handleToggle = useCallback((isOpen: any) => {
    const newState = isOpen ? 'open' : 'closed';
    setAdvancedContentState(newState);
  }, []);

  const ecsFieldProps = useMemo(
    () => ({
      isDisabled: !permissions.writeLiveQueries,
    }),
    [permissions.writeLiveQueries]
  );

  const isAdvancedToggleHidden = useMemo(
    () =>
      !(
        permissions.writeLiveQueries ||
        (permissions.runSavedQueries && permissions.readSavedQueries)
      ),
    [permissions.readSavedQueries, permissions.runSavedQueries, permissions.writeLiveQueries]
  );
  const isSavedQueryDisabled = useMemo(
    () => !permissions.runSavedQueries || !permissions.readSavedQueries,
    [permissions.readSavedQueries, permissions.runSavedQueries]
  );

  const commands = useMemo(
    () =>
      handleSubmitForm
        ? [
            {
              name: 'submitOnCmdEnter',
              exec: handleSubmitForm,
            },
          ]
        : [],
    [handleSubmitForm]
  );

  return (
    <>
      {!isSavedQueryDisabled && (
        <SavedQueriesDropdown disabled={isSavedQueryDisabled} onChange={handleSavedQueryChange} />
      )}

      <EuiFormRow
        isInvalid={!!error?.message}
        error={error?.message}
        fullWidth
        isDisabled={!permissions.writeLiveQueries || disabled}
      >
        {!permissions.writeLiveQueries || disabled ? (
          <EuiCodeBlock
            css={euiCodeBlockCss}
            language="sql"
            fontSize="m"
            paddingSize="m"
            transparentBackground={!value.length}
          >
            {value}
          </EuiCodeBlock>
        ) : (
          <OsqueryEditor defaultValue={value} onChange={onChange} commands={commands} />
        )}
      </EuiFormRow>

      <EuiSpacer size="m" />

      {!isAdvancedToggleHidden && (
        <EuiAccordion
          css={euiAccordionCss}
          id="advanced"
          forceState={advancedContentState}
          onToggle={handleToggle}
          buttonContent="Advanced"
          data-test-subj="advanced-accordion-content"
        >
          <EuiSpacer size="xs" />
          <TimeoutField />
          <EuiSpacer size="s" />
          <ECSMappingEditorField euiFieldProps={ecsFieldProps} />
        </EuiAccordion>
      )}
    </>
  );
};

const LiveQueryQueryField = React.memo(LiveQueryQueryFieldComponent);

// eslint-disable-next-line import/no-default-export
export { LiveQueryQueryField as default };
