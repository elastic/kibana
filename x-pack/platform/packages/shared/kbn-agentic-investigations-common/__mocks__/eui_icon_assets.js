/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const React = require('react');

/** Jest stand-in for `@elastic/eui/es/components/icon/assets/*` SVGR modules. */
module.exports = {
  icon: (props) => React.createElement('svg', props),
};
