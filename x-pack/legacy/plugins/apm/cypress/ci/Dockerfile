FROM node:12

RUN apt-get -qq update \
  && apt-get -y -qq install xvfb \
    libgtk-3-0 \
    libxtst6 \
    libnotify-dev \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

## Add host.docker.internal to localhost
RUN apt-get -qq update \
  && apt-get -y -qq install dnsutils \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
