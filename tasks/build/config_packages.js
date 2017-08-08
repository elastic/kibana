import readline from 'readline';
import fs from 'fs';

export default (grunt) => {
  grunt.registerTask('configPackages', 'Set kibana.yml settings on packages', function () {
    const done = this.async();

    const { kibanaYMLReplacements } = grunt.config.get('packages');
    const configFile = grunt.config.get('configFile');
    const platforms = grunt.config.get('platforms');

    const buildDir = platforms.find(platform => platform.name === 'linux-x86_64').buildDir;
    const linux64Path = `${buildDir}/config/kibana.yml`;

    const configReadStream = fs.createReadStream(configFile);
    const linux64WriteStream = fs.createWriteStream(linux64Path);

    const configReadline = readline.createInterface({
      input: configReadStream
    });

    configReadline.on('line', line => {
      Object.keys(kibanaYMLReplacements).forEach(key => {
        const match = new RegExp(`^#${key}.*$`);
        line = line.replace(match, `${key}: ${kibanaYMLReplacements[key]}`);
      });

      linux64WriteStream.write(`${line}\n`);
    })
    .on('close', () => {
      linux64WriteStream.close();
      done();
    });
  });
};
