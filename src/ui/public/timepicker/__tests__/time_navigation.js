import expect from 'expect.js';
import moment from 'moment';
import timeNavigation from '../time_navigation';

describe('timeNavigation', () => {
  let bounds;

  beforeEach(() => {
    bounds = {
      min: moment('2016-01-01T00:00:00.000Z'),
      max: moment('2016-01-01T00:15:00.000Z')
    };
  });

  it('should step forward', () => {
    const {from, to} = timeNavigation.stepForward(bounds);
    expect(from).to.be('2016-01-01T00:15:00.000Z');
    expect(to).to.be('2016-01-01T00:30:00.000Z');
  });

  it('should step backward', () => {
    const {from, to} = timeNavigation.stepBackward(bounds);
    expect(from).to.be('2015-12-31T23:45:00.000Z');
    expect(to).to.be('2016-01-01T00:00:00.000Z');
  });

  it('should zoom out', () => {
    const {from, to} = timeNavigation.zoomOut(bounds);
    expect(from).to.be('2015-12-31T23:52:30.000Z');
    expect(to).to.be('2016-01-01T00:22:30.000Z');
  });

  it('should zoom in', () => {
    const {from, to} = timeNavigation.zoomIn(bounds);
    expect(from).to.be('2016-01-01T00:03:45.000Z');
    expect(to).to.be('2016-01-01T00:11:15.000Z');
  });
});
