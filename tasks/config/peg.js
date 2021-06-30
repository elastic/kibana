/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = {
  kuery: {
    src: 'packages/kbn-es-query/src/kuery/ast/kuery.peg',
    dest: 'packages/kbn-es-query/src/kuery/ast/_generated_/kuery.js',
    options: {
      allowedStartRules: ['start', 'Literal'],
      cache: true,
    },
  },
  timelion_chain: {
    src: 'src/plugins/vis_type_timelion/common/chain.peg',
    dest: 'src/plugins/vis_type_timelion/common/_generated_/chain.js',
  },
};
