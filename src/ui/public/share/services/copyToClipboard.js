import { Notifier } from 'ui/notify/notifier';
import { uiModules } from 'ui/modules';

const app = uiModules.get('kibana');

app.factory('copyToClipboardService', () => {
  const notify = new Notifier({
    location: `Copy To Clipboard`,
  });
  return {
    copyText: text => {
      const temp = document.createElement('textarea');
      temp.value = text;
      temp.cols = 1;
      temp.rows = 1;
      temp.style.color = 'transparent';
      temp.style.border = 'none';
      document.body.appendChild(temp);
      temp.select();
      let isCopied = false;
      try {
        isCopied = document.execCommand('copy');
        if (isCopied) {
          notify.info('URL copied to clipboard.');
        } else {
          notify.error('Failed to Copy to Clipboard.');
        }
      } catch (err) {
        notify.error('Failed to Copy to Clipboard.');
      }
      document.body.removeChild(temp);
    }
  };
});