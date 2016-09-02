import {
  getUnhashableStatesProvider,
  unhashUrl,
} from 'ui/state_management/state_hashing';

import urlShortenerProvider from '../lib/url_shortener';

import uiModules from 'ui/modules';
import shareTemplate from 'ui/share/views/share.html';
const app = uiModules.get('kibana');

app.directive('share', function (Private, Notifier) {
  const getUnhashableStates = Private(getUnhashableStatesProvider);
  const urlShortener = Private(urlShortenerProvider);

  return {
    restrict: 'E',
    scope: {
      objectType: '@',
      objectId: '@',
      allowEmbed: '@allowEmbed'
    },
    template: shareTemplate,
    controllerAs: 'share',
    controller: function ($scope, $location, globalState) {
      // Default to allowing an embedded IFRAME, unless it's explicitly set to false.
      this.allowEmbed = $scope.allowEmbed === 'false' ? false : true;
      this.objectType = $scope.objectType;

      function getOriginalUrl(url) {
        // If there is no objectId, then it isn't saved, so it has no original URL.
        if ($scope.objectId === undefined || $scope.objectId === '') {
          return;
        }

        // Remove the query string.
        return url.split('?')[0];
      };

      function getSnapshotUrl(url) {
        // Replace hashes with original RISON values.
        const urlWithStates = unhashUrl(url, getUnhashableStates());
        return urlWithStates;
      }

      this.getEmbeddableUrl = url => {
        const embedQueryParam = '?embed=true';
        const urlHasQueryString = url.indexOf('?') !== -1;
        const embeddableUrl =
          urlHasQueryString ? url.replace('?', `${embedQueryParam}&`) : `${url}${embedQueryParam}`;
        return embeddableUrl;
      };

      this.getIframeUrl = url => {
        const embeddableUrl = this.getEmbeddableUrl(url);
        return `<iframe src="${embeddableUrl}" height="600" width="800"></iframe>`;
      };

      // Original URLs.
      this.originalUrl;

      // Snapshot URLs.
      this.shortSnapshotUrl;
      this.snapshotUrl;
      this.shortSnapshotIframeUrl;
      this.snapshotIframeUrl;

      const updateUrls = () => {
        const url = $location.absUrl();
        this.originalUrl = getOriginalUrl(url);
        this.snapshotUrl = getSnapshotUrl(url);
      };

      updateUrls();

      // When the URL changes, update the links in the UI.
      $scope.$watch($location.absUrl, updateUrls);

      this.useShortUrl = (shortUrlProperty, url) => {
        if (this[shortUrlProperty]) return;
        urlShortener.shortenUrl(url)
        .then(shortUrl => {
          this[shortUrlProperty] = shortUrl;
        });
      };

      this.copyToClipboard = selector => {
        const notify = new Notifier({
          location: `Share ${$scope.objectType}`,
        });

        try {
          // Select the text to be copied. If the copy fails, the user can easily copy it manually.
          const copyTextarea = document.querySelector(selector);
          copyTextarea.select();

          const isCopied = document.execCommand('copy');
          if (isCopied) {
            notify.info('URL copied to clipboard.');
          } else {
            notify.info('URL selected. Press Ctrl+C to copy.');
          }
        } catch (err) {
          notify.info('URL selected. Press Ctrl+C to copy.');
        }
      };
    }
  };
});
