import { uniq, where, groupBy, mapValues, pluck } from 'lodash';

export class ConflictTracker {
  constructor() {
    this._history = [];
  }

  trackField(name, type, index) {
    this._history.push({ name, type, index });
  }

  describeConflict(name) {
    const fieldHistory = where(this._history, { name });
    const entriesByType = groupBy(fieldHistory, 'type');

    return mapValues(entriesByType, (entries) => {
      const indices = uniq(pluck(entries, 'index'));

      // keep the list short so we don't polute the .kibana index
      if (indices.length > 10) {
        const total = indices.length;
        indices.length = 9;
        indices.push(`... and ${total - indices.length} others`);
      }

      return indices;
    });
  }
}
