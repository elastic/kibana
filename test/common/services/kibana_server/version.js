export class KibanaServerVersion {
  constructor(kibanaStatus) {
    this.kibanaStatus = kibanaStatus;
    this._cachedVersionNumber;
  }

  async get() {
    if (this._cachedVersionNumber) {
      return this._cachedVersionNumber;
    }

    const status = await this.kibanaStatus.get();
    if (status && status.version && status.version.number) {
      this._cachedVersionNumber = status.version.number;
      return this._cachedVersionNumber;
    }

    throw new Error(`Unable to fetch Kibana Server status, received ${JSON.stringify(status)}`);
  }
}
