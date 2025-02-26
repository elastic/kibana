FROM ubuntu:noble

ENV CHROMIUM_COMMIT_HASH
ENV PLATFORM_VARIANT

# Create a new user to avoid using root
RUN useradd -ms /bin/bash developer

# install base dependencies
RUN apt-get update && \
    apt-get install -y curl git-all build-essential pkg-config tmux gcc gperf python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /home/chromium

COPY . .

RUN export PATH=/home/chromium/depot_tools:$PATH

RUN python3 --version && \
    # Install the OS packages, configure the environment, download the chromium source (25GB)
    python3 ./init.py

ENTRYPOINT [ "python3", "./build_chromium/build.py", "${CHROMIUM_COMMIT_HASH}",  "${PLATFORM_VARIANT}"]
