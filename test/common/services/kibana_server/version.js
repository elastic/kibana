export class KibanaServerVersion {
  constructor(kibanaStatus) {
    this.kibanaStatus = kibanaStatus;
    this._cachedVersionNumber = null;
  }

  async get() {
    if (!this._cachedVersionNumber) {
      const status = await this.kibanaStatus.get();
      this._cachedVersionNumber = status.version.number;
    }

    return this._cachedVersionNumber;
  }
}
