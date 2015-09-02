// ng-clip expects ZeroClipboard to be global, but it's UMD, so it never is
window.ZeroClipboard = require('node_modules/zeroclipboard/dist/ZeroClipboard.js');
window.ZeroClipboard.SWF_URL = require('file!node_modules/zeroclipboard/dist/ZeroClipboard.swf');

window.ZeroClipboard.config({
  swfPath: window.ZeroClipboard.SWF_URL,
});

module.exports = window.ZeroClipboard;
