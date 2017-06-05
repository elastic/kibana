import chrome from 'ui/chrome';
import url from 'url';

export function UrlShortenerProvider(Notifier, $http) {
  const notify = new Notifier({
    location: 'Url Shortener'
  });

  function shortenUrl(absoluteUrl) {
    const basePath = chrome.getBasePath();

    const parsedUrl = url.parse(absoluteUrl);
    const path = parsedUrl.path.replace(basePath, '');
    const hash = parsedUrl.hash ? parsedUrl.hash : '';
    const relativeUrl = path + hash;

    const formData = { url: relativeUrl };

    return $http.post(`${basePath}/shorten`, formData).then((result) => {
      return url.format({
        protocol: parsedUrl.protocol,
        host: parsedUrl.host,
        pathname: `${basePath}/goto/${result.data}`
      });
    }).catch((response) => {
      notify.error(response);
    });
  }

  return {
    shortenUrl
  };
}
