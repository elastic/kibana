const debugInBand = process.execArgv.some(arg => {
  switch (arg) {
    case '--debug':
    case '--debug-brk':
    case '-d':
    case '--inspect':
      return true;
  }
});

if (debugInBand) {
  process.argv.push('--no-timeouts');
  require('mocha/bin/_mocha');
} else {
  require('mocha/bin/mocha');
}
