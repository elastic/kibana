/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import _ from 'lodash';

export const V0 = {
  mappings: {
    dog: {
      properties: {
        name: { type: 'keyword' },
      },
    },
  },
  insertDocs: [{
    _id: 'dog:old',
    _source: {
      type: 'dog',
      dog: {
        name: 'OldYeller'
      },
    },
  }],
};

export const V1 = {
  docs: {
    transformedSeed: {
      id: 'dog:callie',
      source: {
        type: 'dog',
        dog: {
          name: 'Callie',
          eats: 'Anything but dog food',
        },
      },
    },
    transformedOriginal: {
      id: 'dog:old',
      source: {
        type: 'dog',
        dog: {
          name: 'OldYeller',
          eats: 'Anything but dog food',
        },
      },
    },
  },

  plugin: {
    id: 'dog-plugin',

    mappings: {
      dog: {
        properties: {
          eats: { type: 'text' },
          name: { type: 'keyword' },
        },
      },
    },

    migrations: [{
      id: 'dog-seed',
      type: 'dog',
      seed: () => ({
        id: 'callie',
        type: 'dog',
        attributes: {
          name: 'Callie',
        },
      }),
    }, {
      id: 'dog-add-eats',
      type: 'dog',
      transform: (doc) => _.set(_.cloneDeep(doc), 'attributes.eats', 'Anything but dog food'),
    }],
  },
};

export const V2 = {
  docs: {
    transformedSeed: {
      id: 'dog:callie',
      source: {
        type: 'dog',
        dog: {
          name: 'Callie',
          eats: 'Anything but dog food',
          does: 'nothing',
        },
      },
    },
    transformedOriginal: {
      id: 'dog:old',
      source: {
        type: 'dog',
        dog: {
          name: 'OldYeller',
          eats: 'Anything but dog food',
          does: 'nothing',
        },
      },
    },
  },

  plugin: {
    ...V1.plugin,

    mappings: {
      dog: {
        properties: {
          eats: { type: 'text' },
          name: { type: 'keyword' },
          does: { type: 'text' },
        },
      },
    },

    migrations: [
      ...V1.plugin.migrations,
      {
        id: 'dog-does',
        type: 'dog',
        transform: (doc) => _.set(_.cloneDeep(doc), 'attributes.does', 'nothing'),
      },
    ],
  }
};
