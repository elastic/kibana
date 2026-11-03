/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButtonEmpty, EuiFormErrorText, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFieldArray, useFormContext, useFormState } from 'react-hook-form';
import type { BuildConnectorFormData } from './types';
import { ActionEditor } from './action_editor';
import { createEmptyAction } from './form_serializers';

/** The list of actions a connector type offers; one is shown by default. */
const ActionListEditorComponent: React.FC = () => {
  const { control } = useFormContext<BuildConnectorFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'actions' });
  const { errors } = useFormState({ control, name: 'actions' });
  const listError = errors.actions?.root?.message;

  return (
    <div data-test-subj="buildConnectorActions">
      <EuiTitle size="xxs">
        <h4>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.buildConnectorFlyout.actionsTitle"
            defaultMessage="Actions"
          />
        </h4>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.buildConnectorFlyout.actionsDescription"
          defaultMessage="The HTTP requests this connector type can make. A rule picks one and provides its params."
        />
      </EuiText>
      {fields.map((item, index) => (
        <React.Fragment key={item.id}>
          <EuiSpacer size="s" />
          <ActionEditor index={index} onRemove={() => remove(index)} />
        </React.Fragment>
      ))}
      {listError && (
        <EuiFormErrorText data-test-subj="buildConnectorActions-error">
          {listError}
        </EuiFormErrorText>
      )}
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        size="s"
        iconType="plusCircle"
        onClick={() => append(createEmptyAction())}
        data-test-subj="buildConnectorActions-add"
      >
        {i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorFlyout.addActionButtonLabel',
          {
            defaultMessage: 'Add action',
          }
        )}
      </EuiButtonEmpty>
    </div>
  );
};

export const ActionListEditor = memo(ActionListEditorComponent);
