/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCodeEditor } from '@elastic/eui';
import { Template } from '../../../../../../common/types';

interface Props {
  templateDetails: Template;
}

export const AliasesTab: React.FunctionComponent<Props> = ({ templateDetails }) => {
  const { aliases } = templateDetails;

  return (
    <div data-test-subj="aliasesTab">
      <EuiCodeEditor
        mode="json"
        theme="textmate"
        width="100%"
        isReadOnly
        value={aliases}
        aria-label={i18n.translate(
          'xpack.idxMgmt.templateDetails.aliasesTab.aliasesEditorAriaLabel',
          {
            defaultMessage: 'Aliases code editor',
          }
        )}
      />
    </div>
  );
};
