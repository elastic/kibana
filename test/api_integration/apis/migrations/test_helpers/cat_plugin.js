import _ from 'lodash';

export const V0 = {
  mappings: {
    cat: {
      properties: {
        name: { type: 'keyword' },
      },
    },
  },
  insertDocs: [{
    _id: 'cat:old',
    _source: {
      type: 'cat',
      cat: {
        name: 'MouseSlayer'
      },
    },
  }],
};

export const V1 = {
  docs: {
    transformedSeed: {
      id: 'cat:boots',
      source: {
        type: 'cat',
        cat: {
          name: 'Boots',
          action: 'sleep',
        },
      },
    },
    transformedOriginal: {
      id: 'cat:old',
      source: {
        type: 'cat',
        cat: {
          name: 'MouseSlayer',
          action: 'lie_around',
        },
      },
    },
  },
  plugin: {
    id: 'cat-plugin',

    mappings: {
      cat: {
        properties: {
          action: { type: 'keyword' },
          name: { type: 'keyword' },
        },
      },
    },

    migrations: [{
      id: 'cat-ensure-action',
      type: 'cat',
      transform: (doc) => _.set(_.cloneDeep(doc), 'attributes.action', 'lie_around'),
    }, {
      id: 'cat-seed',
      type: 'cat',
      seed: () => ({
        id: 'boots',
        type: 'cat',
        attributes: {
          action: 'sleep',
        },
      }),
    }, {
      id: 'cat-add-name',
      type: 'cat',
      transform: (doc) => _.set(_.cloneDeep(doc), 'attributes.name', doc.attributes.name || 'Boots'),
    }],
  }
};

export const V2 = {
  docs: {
    transformedSeed: {
      id: 'cat:boots',
      source: {
        type: 'cat',
        cat: {
          name: 'Boots',
          primaryAction: 'sleep',
          secondaryAction: 'move-to-sunlight'
        },
      },
    },
    transformedOriginal: {
      id: 'cat:old',
      source: {
        type: 'cat',
        cat: {
          name: 'MouseSlayer',
          primaryAction: 'lie_around',
          secondaryAction: 'move-to-sunlight',
        },
      },
    },
  },

  plugin: {
    ...V1.plugin,

    mappings: {
      cat: {
        properties: {
          primaryAction: { type: 'keyword' },
          secondaryAction: { type: 'keyword' },
          name: { type: 'keyword' },
        },
      },
    },

    migrations: [
      ...V1.plugin.migrations,
      {
        id: 'cat-actions',
        type: 'cat',
        transform: (doc) => ({
          ...doc,
          attributes: {
            ..._.omit(doc.attributes, 'action'),
            primaryAction: doc.attributes.action,
            secondaryAction: 'move-to-sunlight',
          },
        }),
      },
    ],
  }
};
