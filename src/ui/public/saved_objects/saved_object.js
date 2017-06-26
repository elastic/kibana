import _ from 'lodash';

export class SavedObject {
  constructor(client, { id, type, version, attributes } = {}) {
    this._client = client;
    this.id = id;
    this.type = type;
    this.attributes = attributes || {};
    this._version = version;
  }

  get(key) {
    return _.get(this.attributes, key);
  }

  set(key, value) {
    return _.set(this.attributes, key, value);
  }

  has(key) {
    return _.has(this.attributes, key);
  }

  save() {
    if (this.id) {
      return this._client.update(this.type, this.id, this.attributes);
    } else {
      return this._client.create(this.type, this.attributes);
    }
  }

  delete() {
    return this._client.delete(this.type, this.id);
  }
}
