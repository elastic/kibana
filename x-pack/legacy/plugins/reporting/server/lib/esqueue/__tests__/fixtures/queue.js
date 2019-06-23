import events from 'events';

export class QueueMock extends events.EventEmitter {
  constructor() {
    super();
  }

  setClient(client) {
    this.client = client;
  }
}
