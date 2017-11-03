import expect from 'expect.js';
import sinon from 'sinon';

import { stdin } from '../stdin';

describe('stdin', () => {
  const sandbox = sinon.sandbox.create();

  beforeEach(() => {
    sandbox.stub(process.stdin, 'read');
    sandbox.stub(process.stdin, 'on');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('resolves with input', async () => {
    process.stdin.on = ((_, fn) => { fn(); });

    process.stdin.read.onCall(0).returns('kib');
    process.stdin.read.onCall(1).returns('ana');
    process.stdin.read.onCall(2).returns(null);

    const text = await stdin();
    expect(text).to.eql('kibana');
  });
});
