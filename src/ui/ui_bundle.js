import { join } from 'path';
import { promisify } from 'bluebird';

const read = promisify(require('fs').readFile);
const write = promisify(require('fs').writeFile);
const unlink = promisify(require('fs').unlink);
const stat = promisify(require('fs').stat);

module.exports = class UiBundle {
  constructor(opts) {

    opts = opts || {};
    this.id = opts.id;
    this.modules = opts.modules;
    this.template = opts.template;
    this.env = opts.env;

    const pathBase = join(this.env.workingDir, this.id);
    this.entryPath = `${pathBase}.entry.js`;
    this.outputPath = `${pathBase}.bundle.js`;

  }

  renderContent() {
    return this.template({
      env: this.env,
      bundle: this
    });
  }

  async readEntryFile() {
    try {
      const content = await read(this.entryPath);
      return content.toString('utf8');
    }
    catch (e) {
      return null;
    }
  }

  async writeEntryFile() {
    return await write(this.entryPath, this.renderContent(), { encoding: 'utf8' });
  }

  async clearBundleFile() {
    try { await unlink(this.outputPath); }
    catch (e) { return null; }
  }

  async checkForExistingOutput() {
    try {
      await stat(this.outputPath);
      return true;
    }
    catch (e) {
      return false;
    }
  }

  toJSON() {
    return {
      id: this.id,
      modules: this.modules,
      entryPath: this.entryPath,
      outputPath: this.outputPath
    };
  }
};
