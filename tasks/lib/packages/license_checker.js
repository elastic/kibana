import licenseChecker from 'license-checker';

export function callLicenseChecker(options = {}) {
  const {
    directory,
    dev = false
  } = options;

  if (!directory) {
    throw new Error('You must specify the directory where license checker should start');
  }

  return new Promise((resolve, reject) => {
    licenseChecker.init({
      start: directory,
      production: !dev,
      json: true,
      customFormat: {
        realPath: true,
        licenseText: false,
        licenseFile: false
      }
    }, (err, licenseInfo) => {
      if (err) reject(err);
      else resolve(licenseInfo);
    });
  });
}
