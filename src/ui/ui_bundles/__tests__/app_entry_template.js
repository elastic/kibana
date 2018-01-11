import sinon from 'sinon';
import expect from 'expect.js';

import { appEntryTemplate } from '../app_entry_template';

function createMockBundle() {
  return {
    getContext: sinon.stub().returns(''),
    getRequires: sinon.stub().returns([])
  };
}

describe('ui bundles / appEntryTemplate', () => {
  it('embeds bundle.getContext() result', () => {
    const bundle = createMockBundle();
    bundle.getContext.returns('foo bar baz');
    expect(appEntryTemplate(bundle)).to.contain('foo bar baz');
  });

  it('joins requires into list', () => {
    const bundle = createMockBundle();
    const requires = [
      'foo',
      'bar',
      'baz'
    ];
    bundle.getRequires.returns(requires);
    expect(appEntryTemplate(bundle)).to.contain(requires.join('\n'));
  });
});
