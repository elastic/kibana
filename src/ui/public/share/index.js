const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const { parse } = require('querystring');
const angular = require('angular');

app.directive('share', function (Private) {
  const urlShortener = Private(require('./url_shortener'));

  return {
    restrict: 'E',
    scope: {
      objectType: '@',
      objectId: '@',
      setAllowEmbed: '&?allowEmbed'
    },
    template: require('ui/share/index.html'),
    controller: function ($scope, $rootScope, $location) {
      $scope.allowEmbed = $scope.setAllowEmbed ? $scope.setAllowEmbed() : true;
      $scope.shortUrlsLoading = false;

      function updateUrl(url) {
        $scope.url = url;
        $scope.embedUrl = url.replace('?', '?embed&');

        //when the url changes we want to hide any generated short urls
        $scope.shortenUrls = false;
        $scope.shortUrl = undefined;
      }

      function buildQueryString(data) {
        var result = [];
        _.forOwn(data, (value, key) => {
          result.push(`${key}=${value}`);
        });
        return result.join('&');
      }

      function removeAppState(url) {
        let index = url.indexOf('?');
        if (index === -1) return url;

        let base = url.substring(0, index);
        let qs = url.substring(index + 1);

        let qsParts = parse(qs);
        delete qsParts._a;
        qs = buildQueryString(qsParts);

        return `${base}?${qs}`;
      }

      $scope.getUrl = function () {
        return $location.absUrl();
      };

      $scope.$watch('getUrl()', updateUrl);

      $scope.$watch('ignoreState', enabled => {
        if (enabled) {
          updateUrl(removeAppState($scope.url));
        } else {
          updateUrl($scope.getUrl());
        }
      });

      $scope.$watch('shortenUrls', enabled => {
        if (!!enabled) {
          if ($scope.shortUrl) {
            $scope.shortUrlsLoading = false;
          } else {
            $scope.shortUrlsLoading = true;

            const linkPromise = urlShortener.shortenUrl($scope.url)
            .then(shortUrl => {
              $scope.shortUrl = shortUrl;
            });

            const embedPromise = urlShortener.shortenUrl($scope.embedUrl)
            .then(shortUrl => {
              $scope.shortEmbedUrl = shortUrl;
            });

            Promise.all([linkPromise, embedPromise])
            .then(() => {
              $scope.shortUrlsLoading = false;
            })
            .catch(err => {
              $scope.shortenUrls = false;
            });
          }
        }
      });
    }
  };
});
