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

export const TabMappings: React.FunctionComponent<Props> = ({ templateDetails }) => {
  const { mappings } = templateDetails;
  const mappingsJsonString = JSON.stringify(mappings, null, 2);

  return (
    <div data-test-subj="mappingsTab">
      <EuiCodeEditor
        mode="json"
        theme="textmate"
        width="100%"
        isReadOnly
        value={mappingsJsonString}
        aria-label={i18n.translate(
          'xpack.idxMgmt.templateDetails.mappingsTab.mappingsEditorAriaLabel',
          {
            defaultMessage: 'Mappings code editor',
          }
        )}
      />
    </div>
  );
};
