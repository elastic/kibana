import { once } from 'lodash';

export class KibanaServerVersion {
  constructor(kibanaStatus) {
    this.kibanaStatus = kibanaStatus;
  }

  get = once(async () => {
    const status = await this.kibanaStatus.get();
    return status.version;
  })
}
