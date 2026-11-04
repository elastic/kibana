/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldListEditor } from './field_list_editor';

/** Explains the `config` object; shown on the info icon of the config field list. */
const CONFIG_TOOLTIP = (
  <p>
    <FormattedMessage
      id="xpack.triggersActionsUI.sections.buildConnectorPage.configTooltip"
      defaultMessage="The {config} object. Its fields are entered once, when a user creates a connector of this type, for example a base URL, and are available in every action's request as {example}."
      values={{ config: <code>config</code>, example: <code>{'{{config.<name>}}'}</code> }}
    />
  </p>
);

const CONFIG_DESCRIPTION = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.buildConnectorPage.configDescription"
    defaultMessage="Entered when a connector of this type is created. Use as {example}."
    values={{ example: <code>{'{{config.<name>}}'}</code> }}
  />
);

/** The connector type's `config` field list; its step names it, so it has no heading of its own. */
const ConfigFieldListEditorComponent: React.FC = () => (
  <FieldListEditor
    name="config"
    title={i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.configTitle', {
      defaultMessage: 'Config',
    })}
    showTitle={false}
    description={CONFIG_DESCRIPTION}
    tooltipContent={CONFIG_TOOLTIP}
    addButtonLabel={i18n.translate(
      'xpack.triggersActionsUI.sections.buildConnectorPage.addConfigFieldButtonLabel',
      { defaultMessage: 'Add config field' }
    )}
    testSubjPrefix="buildConnectorConfigFields"
  />
);

export const ConfigFieldListEditor = memo(ConfigFieldListEditorComponent);
