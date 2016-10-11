#!/usr/bin/env bash

set -e

# VNC and Xvfb
# From: https://github.com/SeleniumHQ/docker-selenium/blob/910b4f603017bdb422b490ff9a107f4a46c39846/NodeBase/Dockerfile
apt-get update -y
apt-get install -y xvfb
rm -rf /var/lib/apt/lists/*

# Install Google Chrome
# From https://github.com/SeleniumHQ/docker-selenium/blob/master/NodeChrome/Dockerfile
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list
apt-get update -y
apt-get install -y google-chrome-stable
rm /etc/apt/sources.list.d/google-chrome.list
rm -rf /var/lib/apt/lists/*
