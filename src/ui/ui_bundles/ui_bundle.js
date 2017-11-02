import { promisify } from 'bluebird';

const read = promisify(require('fs').readFile);
const write = promisify(require('fs').writeFile);
const unlink = promisify(require('fs').unlink);
const stat = promisify(require('fs').stat);

export class UiBundle {
  constructor(options) {
    const {
      id,
      modules,
      template,
      controller,
    } = options;

    this._id = id;
    this._modules = modules;
    this._template = template;
    this._controller = controller;
  }

  getId() {
    return this._id;
  }

  getContext() {
    return this._controller.getContext();
  }

  getEntryPath() {
    return this._controller.resolvePath(`${this.getId()}.entry.js`);
  }

  getOutputPath() {
    return this._controller.resolvePath(`${this.getId()}.bundle.js`);
  }

  getRequires() {
    return this._modules.map(module => (
      `require('${module}');`
    ));
  }

  renderContent() {
    return this._template(this);
  }

  async readEntryFile() {
    try {
      const content = await read(this.getEntryPath());
      return content.toString('utf8');
    }
    catch (e) {
      return null;
    }
  }

  async writeEntryFile() {
    return await write(this.getEntryPath(), this.renderContent(), { encoding: 'utf8' });
  }

  async clearBundleFile() {
    try { await unlink(this.getOutputPath()); }
    catch (e) { return null; }
  }

  async isCacheValid() {
    try {
      await stat(this.getOutputPath());
      return true;
    }
    catch (e) {
      return false;
    }
  }

  toJSON() {
    return {
      id: this._id,
      modules: this._modules,
      entryPath: this.getEntryPath(),
      outputPath: this.getOutputPath()
    };
  }
}
