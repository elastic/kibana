import { parseInterval } from 'ui/utils/parse_interval';
import expect from 'expect.js';

describe('parseInterval', function () {
  it('should correctly parse an interval containing unit and value', function () {
    let duration = parseInterval('1d');
    expect(duration.as('d')).to.be(1);

    duration = parseInterval('2y');
    expect(duration.as('y')).to.be(2);

    duration = parseInterval('5M');
    expect(duration.as('M')).to.be(5);

    duration = parseInterval('5m');
    expect(duration.as('m')).to.be(5);

    duration = parseInterval('250ms');
    expect(duration.as('ms')).to.be(250);

    duration = parseInterval('100s');
    expect(duration.as('s')).to.be(100);

    duration = parseInterval('23d');
    expect(duration.as('d')).to.be(23);

    duration = parseInterval('52w');
    expect(duration.as('w')).to.be(52);
  });

  it('should correctly parse fractional intervals containing unit and value', function () {
    let duration = parseInterval('1.5w');
    expect(duration.as('w')).to.be(1.5);

    duration = parseInterval('2.35y');
    expect(duration.as('y')).to.be(2.35);
  });

  it('should correctly bubble up intervals which are less than 1', function () {
    let duration = parseInterval('0.5y');
    expect(duration.as('d')).to.be(183);

    duration = parseInterval('0.5d');
    expect(duration.as('h')).to.be(12);
  });

  it('should correctly parse a unit in an interval only', function () {
    let duration = parseInterval('ms');
    expect(duration.as('ms')).to.be(1);

    duration = parseInterval('d');
    expect(duration.as('d')).to.be(1);

    duration = parseInterval('m');
    expect(duration.as('m')).to.be(1);

    duration = parseInterval('y');
    expect(duration.as('y')).to.be(1);

    duration = parseInterval('M');
    expect(duration.as('M')).to.be(1);
  });

  it('should return null for an invalid interval', function () {
    let duration = parseInterval('');
    expect(duration).to.not.be.ok();

    duration = parseInterval(null);
    expect(duration).to.not.be.ok();

    duration = parseInterval('234asdf');
    expect(duration).to.not.be.ok();
  });
});
