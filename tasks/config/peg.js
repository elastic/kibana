/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

module.exports = {
  kuery: {
    src: 'src/plugins/data/common/es_query/kuery/ast/kuery.peg',
    dest: 'src/plugins/data/common/es_query/kuery/ast/_generated_/kuery.js',
    options: {
      allowedStartRules: ['start', 'Literal'],
    },
  },
  timelion_chain: {
    src: 'src/plugins/vis_type_timelion/public/chain.peg',
    dest: 'src/plugins/vis_type_timelion/public/_generated_/chain.js',
  },
};
