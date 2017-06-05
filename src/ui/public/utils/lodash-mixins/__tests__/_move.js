import _ from 'lodash';
import expect from 'expect.js';
describe('_.move', function () {

  it('accepts previous from->to syntax', function () {
    const list = [
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      8,
      1,
      1,
    ];

    expect(list[3]).to.be(1);
    expect(list[8]).to.be(8);

    _.move(list, 8, 3);

    expect(list[8]).to.be(1);
    expect(list[3]).to.be(8);
  });

  it('moves an object up based on a function callback', function () {
    const list = [
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      1,
      1,
      1,
    ];

    expect(list[4]).to.be(0);
    expect(list[5]).to.be(1);
    expect(list[6]).to.be(0);

    _.move(list, 5, false, function (v) {
      return v === 0;
    });

    expect(list[4]).to.be(1);
    expect(list[5]).to.be(0);
    expect(list[6]).to.be(0);
  });

  it('moves an object down based on a function callback', function () {
    const list = [
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      1,
      1,
      1,
    ];

    expect(list[4]).to.be(0);
    expect(list[5]).to.be(1);
    expect(list[6]).to.be(0);

    _.move(list, 5, true, function (v) {
      return v === 0;
    });

    expect(list[4]).to.be(0);
    expect(list[5]).to.be(0);
    expect(list[6]).to.be(1);
  });

  it('moves an object up based on a where callback', function () {
    const list = [
      { v: 1 },
      { v: 1 },
      { v: 1 },
      { v: 1 },
      { v: 0 },
      { v: 1 },
      { v: 0 },
      { v: 1 },
      { v: 1 },
      { v: 1 },
      { v: 1 },
    ];

    expect(list[4]).to.have.property('v', 0);
    expect(list[5]).to.have.property('v', 1);
    expect(list[6]).to.have.property('v', 0);

    _.move(list, 5, false, { v: 0 });

    expect(list[4]).to.have.property('v', 1);
    expect(list[5]).to.have.property('v', 0);
    expect(list[6]).to.have.property('v', 0);
  });


  it('moves an object up based on a where callback', function () {
    const list = [
      { v: 1 },
      { v: 1 },
      { v: 1 },
      { v: 1 },
      { v: 0 },
      { v: 1 },
      { v: 0 },
      { v: 1 },
      { v: 1 },
      { v: 1 },
      { v: 1 },
    ];

    expect(list[4]).to.have.property('v', 0);
    expect(list[5]).to.have.property('v', 1);
    expect(list[6]).to.have.property('v', 0);

    _.move(list, 5, true, { v: 0 });

    expect(list[4]).to.have.property('v', 0);
    expect(list[5]).to.have.property('v', 0);
    expect(list[6]).to.have.property('v', 1);
  });

  it('moves an object down based on a pluck callback', function () {
    const list = [
      { id: 0, normal: true },
      { id: 1, normal: true },
      { id: 2, normal: true },
      { id: 3, normal: true },
      { id: 4, normal: true },
      { id: 5, normal: false },
      { id: 6, normal: true },
      { id: 7, normal: true },
      { id: 8, normal: true },
      { id: 9, normal: true }
    ];

    expect(list[4]).to.have.property('id', 4);
    expect(list[5]).to.have.property('id', 5);
    expect(list[6]).to.have.property('id', 6);

    _.move(list, 5, true, 'normal');

    expect(list[4]).to.have.property('id', 4);
    expect(list[5]).to.have.property('id', 6);
    expect(list[6]).to.have.property('id', 5);
  });
});
