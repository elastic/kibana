#!/bin/sh
set -e

user_check() {
  getent passwd "$1" > /dev/null 2>&1
}

user_create() {
  # Create a system user. A system user is one within the system uid range and
  # has no expiration
  useradd -r "$1"
}

if ! user_check "<%= user %>" ; then
  user_create "<%= user %>"
fi
chown -R <%= user %>:<%= group %> <%= optimizeDir %>
