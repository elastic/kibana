/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for quick addition of a partitioning field value
 * to a filter list used in the scope part of a rule.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export function AddToFilterListLink({ fieldValue, filterId, addItemToFilterList }) {
  return (
    <EuiLink onClick={() => addItemToFilterList(fieldValue, filterId, true)}>
      <FormattedMessage
        id="xpack.ml.ruleEditor.addValueToFilterListLinkText"
        defaultMessage="Add {fieldValue} to {filterId}"
        values={{ fieldValue, filterId }}
      />
    </EuiLink>
  );
}
AddToFilterListLink.propTypes = {
  fieldValue: PropTypes.string.isRequired,
  filterId: PropTypes.string.isRequired,
  addItemToFilterList: PropTypes.func.isRequired,
};
