import expect from 'expect.js';

import management from 'ui/management';
import ManagementSection from 'ui/management/section';

describe('Management', () => {
  it('provides ManagementSection', () => {
    expect(management).to.be.a(ManagementSection);
  });
});
