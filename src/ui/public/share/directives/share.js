import {
  parse as parseUrl,
  format as formatUrl,
} from 'url';

import {
  getUnhashableStatesProvider,
  unhashUrl,
} from 'ui/state_management/state_hashing';
import { Notifier } from 'ui/notify/notifier';

import { UrlShortenerProvider } from '../lib/url_shortener';

import { uiModules } from 'ui/modules';
import shareTemplate from 'ui/share/views/share.html';
const app = uiModules.get('kibana');

app.directive('share', function (Private) {
  const getUnhashableStates = Private(getUnhashableStatesProvider);
  const urlShortener = Private(UrlShortenerProvider);

  return {
    restrict: 'E',
    scope: {
      objectType: '@',
      objectId: '@',
      allowEmbed: '@',
    },
    template: shareTemplate,
    controllerAs: 'share',
    controller: function ($scope, $document, $location) {
      if ($scope.allowEmbed !== 'false' && $scope.allowEmbed !== undefined) {
        throw new Error('allowEmbed must be "false" or undefined');
      }

      // Default to allowing an embedded IFRAME, unless it's explicitly set to false.
      this.allowEmbed = $scope.allowEmbed === 'false' ? false : true;
      this.objectType = $scope.objectType;

      function getOriginalUrl() {
        // If there is no objectId, then it isn't saved, so it has no original URL.
        if ($scope.objectId === undefined || $scope.objectId === '') {
          return;
        }

        const url = $location.absUrl();
        // Replace hashes with original RISON values.
        const unhashedUrl = unhashUrl(url, getUnhashableStates());

        const parsedUrl = parseUrl(unhashedUrl);
        // Get the Angular route, after the hash, and remove the #.
        const parsedAppUrl = parseUrl(parsedUrl.hash.slice(1), true);

        return formatUrl({
          protocol: parsedUrl.protocol,
          auth: parsedUrl.auth,
          host: parsedUrl.host,
          pathname: parsedUrl.pathname,
          hash: formatUrl({
            pathname: parsedAppUrl.pathname,
            query: {
              // Add global state to the URL so that the iframe doesn't just show the time range
              // default.
              _g: parsedAppUrl.query._g,
            },
          }),
        });
      }

      function getSnapshotUrl() {
        const url = $location.absUrl();
        // Replace hashes with original RISON values.
        return unhashUrl(url, getUnhashableStates());
      }

      this.makeUrlEmbeddable = url => {
        const embedQueryParam = '?embed=true';
        const urlHasQueryString = url.indexOf('?') !== -1;
        if (urlHasQueryString) {
          return url.replace('?', `${embedQueryParam}&`);
        }
        return `${url}${embedQueryParam}`;
      };

      this.makeIframeTag = url => {
        if (!url) return;

        const embeddableUrl = this.makeUrlEmbeddable(url);
        return `<iframe src="${embeddableUrl}" height="600" width="800"></iframe>`;
      };

      this.urls = {
        original: undefined,
        snapshot: undefined,
        shortSnapshot: undefined,
        shortSnapshotIframe: undefined,
      };

      this.urlFlags = {
        shortSnapshot: false,
        shortSnapshotIframe: false,
      };

      const updateUrls = () => {
        this.urls = {
          original: getOriginalUrl(),
          snapshot: getSnapshotUrl(),
          shortSnapshot: undefined,
          shortSnapshotIframe: undefined,
        };

        // Whenever the URL changes, reset the Short URLs to regular URLs.
        this.urlFlags = {
          shortSnapshot: false,
          shortSnapshotIframe: false,
        };
      };

      // When the URL changes, update the links in the UI.
      $scope.$watch(() => $location.absUrl(), () => {
        updateUrls();
      });

      this.toggleShortSnapshotUrl = () => {
        this.urlFlags.shortSnapshot = !this.urlFlags.shortSnapshot;

        if (this.urlFlags.shortSnapshot) {
          urlShortener.shortenUrl(this.urls.snapshot)
          .then(shortUrl => {
            this.urls.shortSnapshot = shortUrl;
          });
        }
      };

      this.toggleShortSnapshotIframeUrl = () => {
        this.urlFlags.shortSnapshotIframe = !this.urlFlags.shortSnapshotIframe;

        if (this.urlFlags.shortSnapshotIframe) {
          const snapshotIframe = this.makeUrlEmbeddable(this.urls.snapshot);
          urlShortener.shortenUrl(snapshotIframe)
          .then(shortUrl => {
            this.urls.shortSnapshotIframe = shortUrl;
          });
        }
      };

      this.copyToClipboard = selector => {
        const notify = new Notifier({
          location: `Share ${$scope.objectType}`,
        });

        // Select the text to be copied. If the copy fails, the user can easily copy it manually.
        const copyTextarea = $document.find(selector)[0];
        copyTextarea.select();

        try {
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
