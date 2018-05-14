import { size } from 'lodash';
import kibana from '../package.json';
import xpack from '../x-pack/package.json';

function getMismatches(depType) {
  return Object.keys(kibana[depType])
    .map(key => {
      const xpackValue = xpack[depType][key];
      const kibanaValue = kibana[depType][key];
      if (
        xpackValue &&
        kibanaValue &&
        xpackValue !== kibanaValue &&
        !key.includes('@kbn/')
      ) {
        return {
          key,
          xpack: xpackValue,
          kibana: kibanaValue,
        };
      }
    })
    .filter(key => !!key);
}

export default function verifyDependencyVersions(grunt) {
  grunt.registerTask(
    'verifyDependencyVersions',
    'Checks dependency versions',
    () => {
      const devDependenciesMismatches = getMismatches('devDependencies');
      if (size(devDependenciesMismatches) > 0) {
        grunt.log.error(
          'The following devDependencies do not match:',
          JSON.stringify(devDependenciesMismatches, null, 4)
        );
        return false;
      } else {
        grunt.log.writeln('devDependencies match!');
      }
    }
  );
}
