describe('_.organize', function () {
  let _ = require('lodash');
  let expect = require('expect.js');

  it('it works', function () {
    let col = [
      {
        name: 'one',
        roles: ['user', 'admin', 'owner']
      },
      {
        name: 'two',
        roles: ['user']
      },
      {
        name: 'three',
        roles: ['user']
      },
      {
        name: 'four',
        roles: ['user', 'admin']
      }
    ];

    let resp = _.organizeBy(col, 'roles');
    expect(resp).to.have.property('user');
    expect(resp.user).to.have.length(4);

    expect(resp).to.have.property('admin');
    expect(resp.admin).to.have.length(2);

    expect(resp).to.have.property('owner');
    expect(resp.owner).to.have.length(1);
  });

  it('behaves just like groupBy in normal scenarios', function () {
    let col = [
      { name: 'one' },
      { name: 'two' },
      { name: 'three' },
      { name: 'four' }
    ];

    let orgs = _.organizeBy(col, 'name');
    let groups = _.groupBy(col, 'name');
    expect(orgs).to.eql(groups);
  });
});
