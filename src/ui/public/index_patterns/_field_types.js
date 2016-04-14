define(function (require) {
  return function IndexPatternFieldTypes() {
    let IndexedArray = require('ui/IndexedArray');

    return new IndexedArray({
      index: ['name'],
      group: ['sortable', 'filterable'],
      immutable: true,
      initialSet: [
        { name: 'ip',         sortable: true,   filterable: true  },
        { name: 'date',       sortable: true,   filterable: true  },
        { name: 'string',     sortable: true,   filterable: true  },
        { name: 'number',     sortable: true,   filterable: true  },
        { name: 'boolean',    sortable: true,   filterable: true  },
        { name: 'conflict',   sortable: false,  filterable: false },
        { name: 'geo_point',  sortable: false,  filterable: false },
        { name: 'geo_shape',  sortable: false,  filterable: false },
        { name: 'attachment', sortable: false,  filterable: false },
        { name: 'murmur3',    sortable: false,  filterable: false },
        { name: 'unknown',    sortable: false,  filterable: false },
        { name: '_source',    sortable: false,  filterable: false },
      ]
    });
  };
});
