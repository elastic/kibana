const debugInBand = process.execArgv.some(arg => {
  switch (arg) {
    case '--inspect':
    case '--inspect-brk':
      return true;
  }
});

if (debugInBand) {
  process.argv.push('--no-timeouts');
  require('mocha/bin/_mocha');
} else {
  require('mocha/bin/mocha');
}
