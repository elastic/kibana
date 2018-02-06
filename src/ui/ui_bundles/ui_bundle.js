import { fromNode as fcb } from 'bluebird';
import { readFile, writeFile, unlink, stat } from 'fs';

// We normalize all path separators to `/` in generated files
function normalizePath(path) {
  return path.replace(/[\\\/]+/g, '/');
}

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

  getStylePath() {
    return this._controller.resolvePath(`${this.getId()}.style.css`);
  }

  getOutputPath() {
    return this._controller.resolvePath(`${this.getId()}.bundle.js`);
  }

  getRequires() {
    return this._modules.map(module => (
      `require('${normalizePath(module)}');`
    ));
  }

  renderContent() {
    return this._template(this);
  }

  async readEntryFile() {
    try {
      const content = await fcb(cb => readFile(this.getEntryPath(), cb));
      return content.toString('utf8');
    }
    catch (e) {
      return null;
    }
  }

  async writeEntryFile() {
    return await fcb(cb => (
      writeFile(this.getEntryPath(), this.renderContent(), 'utf8', cb)
    ));
  }

  async hasStyleFile() {
    return await fcb(cb => {
      return stat(this.getStylePath(), error => {
        cb(null, !(error && error.code === 'ENOENT'));
      });
    });
  }

  async touchStyleFile() {
    return await fcb(cb => (
      writeFile(this.getStylePath(), '', 'utf8', cb)
    ));
  }

  async clearBundleFile() {
    try {
      await fcb(cb => unlink(this.getOutputPath(), cb));
    } catch (e) {
      return null;
    }
  }

  async isCacheValid() {
    try {
      await fcb(cb => stat(this.getOutputPath(), cb));
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
