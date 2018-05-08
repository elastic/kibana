import expect from 'expect.js';

import { management } from '..';
import { ManagementSection } from '../section';

describe('Management', () => {
  it('provides ManagementSection', () => {
    expect(management).to.be.a(ManagementSection);
  });
});
