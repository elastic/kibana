#!/bin/bash

####
# From: https://github.com/SeleniumHQ/docker-selenium/blob/910b4f6/NodeChrome/chrome_launcher.sh
####

#
#
# Copyright (c) 2011 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# Let the wrapped binary know that it has been run through the wrapper.
export CHROME_WRAPPER="`readlink -f "$0"`"

HERE="`dirname "$CHROME_WRAPPER"`"

# Check if the CPU supports SSE2. If not, try to pop up a dialog to explain the
# problem and exit. Otherwise the browser will just crash with a SIGILL.
# http://crbug.com/348761
grep ^flags /proc/cpuinfo|grep -qs sse2
if [ $? != 0 ]; then
  SSE2_DEPRECATION_MSG="This computer can no longer run Google Chrome because \
its hardware is no longer supported."
  if which zenity &> /dev/null; then
    zenity --warning --text="$SSE2_DEPRECATION_MSG"
  elif which gmessage &> /dev/null; then
    gmessage "$SSE2_DEPRECATION_MSG"
  elif which xmessage &> /dev/null; then
    xmessage "$SSE2_DEPRECATION_MSG"
  else
    echo "$SSE2_DEPRECATION_MSG" 1>&2
  fi
  exit 1
fi

# We include some xdg utilities next to the binary, and we want to prefer them
# over the system versions when we know the system versions are very old. We
# detect whether the system xdg utilities are sufficiently new to be likely to
# work for us by looking for xdg-settings. If we find it, we leave $PATH alone,
# so that the system xdg utilities (including any distro patches) will be used.
if ! which xdg-settings &> /dev/null; then
  # Old xdg utilities. Prepend $HERE to $PATH to use ours instead.
  export PATH="$HERE:$PATH"
else
  # Use system xdg utilities. But first create mimeapps.list if it doesn't
  # exist; some systems have bugs in xdg-mime that make it fail without it.
  xdg_app_dir="${XDG_DATA_HOME:-$HOME/.local/share/applications}"
  mkdir -p "$xdg_app_dir"
  [ -f "$xdg_app_dir/mimeapps.list" ] || touch "$xdg_app_dir/mimeapps.list"
fi

# Always use our versions of ffmpeg libs.
# This also makes RPMs find the compatibly-named library symlinks.
if [[ -n "$LD_LIBRARY_PATH" ]]; then
  LD_LIBRARY_PATH="$HERE:$HERE/lib:$LD_LIBRARY_PATH"
else
  LD_LIBRARY_PATH="$HERE:$HERE/lib"
fi
export LD_LIBRARY_PATH

export CHROME_VERSION_EXTRA="stable"

# We don't want bug-buddy intercepting our crashes. http://crbug.com/24120
export GNOME_DISABLE_CRASH_DIALOG=SET_BY_GOOGLE_CHROME

# Automagically migrate user data directory.
# TODO(phajdan.jr): Remove along with migration code in the browser for M33.
if [[ -n "" ]]; then
  if [[ ! -d "" ]]; then
    "$HERE/chrome" "--migrate-data-dir-for-sxs=" \
      --enable-logging=stderr --log-level=0
  fi
fi

# Make sure that the profile directory specified in the environment, if any,
# overrides the default.
if [[ -n "$CHROME_USER_DATA_DIR" ]]; then
  PROFILE_DIRECTORY_FLAG="--user-data-dir=$CHROME_USER_DATA_DIR"
fi

# Sanitize std{in,out,err} because they'll be shared with untrusted child
# processes (http://crbug.com/376567).
exec < /dev/null
exec > >(exec cat)
exec 2> >(exec cat >&2)

# Note: exec -a below is a bashism.
# DOCKER SELENIUM NOTE: Strait copy of script installed by Chrome with the exception of adding
# the --no-sandbox flag here.
exec -a "$0" "$HERE/chrome" --no-sandbox "$PROFILE_DIRECTORY_FLAG" \
  "$@"
exec -a "$0" /etc/alternatives/google-chrome --no-sandbox "$@"
