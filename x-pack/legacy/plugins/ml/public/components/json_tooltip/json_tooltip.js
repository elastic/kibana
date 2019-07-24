/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// component for placing an icon with a popover tooltip anywhere on a page
// the id will match an entry in tooltips.json
import { getTooltips } from './tooltips';
import PropTypes from 'prop-types';
import React from 'react';

import { EuiIconTip } from '@elastic/eui';

export const JsonTooltip = ({ id, position }) => {
  const tooltips = getTooltips();
  const text = (tooltips[id]) ? tooltips[id].text : '';
  return (
    <span aria-hidden="true" className="ml-info-icon">
      <EuiIconTip
        content={text}
        position={position}
      />
      <span id={`ml_aria_description_${id}`} className="ml-info-tooltip-text">{text}</span>
    </span>
  );
};
JsonTooltip.propTypes = {
  id: PropTypes.string,
  position: PropTypes.string
};
