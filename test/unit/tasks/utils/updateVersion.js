var updateVersion = require('../../../../tasks/utils/updateVersion');

describe('tasks/utils/updateVersion', function () {

  it('applies a basic "minor" update', function () {
    expect(updateVersion('1.4.1', 'minor')).to.be('1.5.0');
  });

  it('accepts a number for a version name', function () {
    expect(updateVersion('1.5.5', 'minor=10')).to.be('1.10.0');
  });

  it('clears the tag and updates all lower version ids', function () {
    expect(updateVersion('0.0.1-beta2', 'major=4')).to.be('4.0.0');
  });

  it('updates just a tag', function () {
    expect(updateVersion('4.0.0-beta1', 'tag=beta2')).to.be('4.0.0-beta2');
  });

  it('clears a tag', function () {
    expect(updateVersion('4.0.0-rc1', 'tag=')).to.be('4.0.0');
  });

  it('adds a tag, bumping the minor version', function () {
    expect(updateVersion('4.0.0', 'tag=snapshot')).to.be('4.1.0-snapshot');
  });

  it('changes a tag', function () {
    expect(updateVersion('4.1.0-snapshot', 'tag=rc1')).to.be('4.1.0-rc1');
  });

});