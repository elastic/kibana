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
