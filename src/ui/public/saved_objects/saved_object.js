import _ from 'lodash';

export class SavedObject {
  constructor(client, attributes) {
    this._client = client;
    this._attributes = attributes;
  }

  get(key) {
    return _.get(this._attributes, key);
  }

  set(key, value) {
    return _.set(this._attributes, key, value);
  }

  save() {
    if (this.id) {
      return this._client.update(this.type, this.id, this._attributes);
    } else {
      return this._client.create(this.type, this._attributes);
    }
  }

  delete() {
    return this._client.delete(this.type, this.id);
  }
}
